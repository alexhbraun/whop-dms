import Image from "next/image";

export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <Image 
        src="https://ik.imagekit.io/rgqefde41/nexo%20logo.png" 
        alt="Nexo" 
        width={36} 
        height={36} 
        className="rounded-lg" 
      />
      <div>
        <h1 className="text-2xl font-semibold text-brand-charcoal">{title}</h1>
        {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
      </div>
    </div>
  );
}
